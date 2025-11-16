import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";
import { set } from "mongoose";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    { event: 'clerk/user.created' },
    async ({ event })=>{
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.create(userData)
    }
)

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk'},
    { event: 'clerk/user.deleted' },
    async ({ event })=>{
        
       const {id} = event.data
       await User.findByIdAndDelete(id)
    }
)

// Inngest Function to update user data in database 
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    { event: 'clerk/user.updated' },
    async ({ event })=>{
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData)
    }
)

// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: 'release-seats-delete-booking'},
    {event: "app/checkpayment"},
    async ({ event, step })=>{
        const bookingId = event.data.bookingId;
        
        // Get the booking to check its creation time
        const booking = await step.run('get-booking', async ()=>{
            return await Booking.findById(bookingId);
        });

        if (!booking) {
            return { message: "Booking not found" };
        }

        // Calculate when 10 minutes will have passed since booking creation
        const bookingCreatedAt = new Date(booking.createdAt);
        const tenMinutesAfterBooking = new Date(bookingCreatedAt.getTime() + 10 * 60 * 1000);
        
        // Wait until 10 minutes have passed since booking creation
        await step.sleepUntil('wait-for-10-minutes', tenMinutesAfterBooking);

        await step.run('check-payment-status-and-cleanup', async ()=>{
            // Re-fetch booking to check current payment status
            const currentBooking = await Booking.findById(bookingId);
            
            if (!currentBooking) {
                return { message: "Booking already deleted" };
            }

            // If payment is still not made after 10 minutes, release seats and delete booking
            if(!currentBooking.isPaid){
                const show = await Show.findById(currentBooking.show);
                if (show) {
                    currentBooking.bookedSeats.forEach((seat)=>{
                        delete show.occupiedSeats[seat]
                    });
                    show.markModified('occupiedSeats')
                    await show.save()
                }
                await Booking.findByIdAndDelete(currentBooking._id)
                return { message: "Booking cancelled and seats released" };
            } else {
                return { message: "Payment completed, booking kept" };
            }
        })
    }
)

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
    {id: "send-booking-confirmation-email"},
    {event: "app/show.booked"},
    async ({ event, step })=>{
        const { bookingId } = event.data;
        
        console.log(`[Email Function] Processing email for booking: ${bookingId}`);
        console.log(`[Email Function] Event data:`, event.data);

        const booking = await step.run('fetch-booking', async () => {
            try {
                // Ensure bookingId is properly formatted
                const bookingIdStr = String(bookingId);
                console.log(`[Email Function] Fetching booking with ID: ${bookingIdStr}`);
                
                const bookingDoc = await Booking.findById(bookingIdStr).populate({
                    path: 'show',
                    populate: {path: "movie", model: "Movie"}
                }).populate('user');
                
                console.log(`[Email Function] Booking found: ${!!bookingDoc}`);
                if (bookingDoc) {
                    console.log(`[Email Function] Booking details:`, {
                        id: bookingDoc._id,
                        isPaid: bookingDoc.isPaid,
                        hasUser: !!bookingDoc.user,
                        hasShow: !!bookingDoc.show,
                        hasMovie: !!bookingDoc.show?.movie
                    });
                }
                
                return bookingDoc;
            } catch (fetchError) {
                console.error(`[Email Function] Error fetching booking:`, fetchError);
                throw fetchError;
            }
        });

        if (!booking) {
            console.error(`[Email Function] Booking not found for ID: ${bookingId}`);
            return { success: false, message: `Booking not found: ${bookingId}` };
        }

        if (!booking.user || !booking.show || !booking.show.movie) {
            console.error('[Email Function] Booking data incomplete:', { 
                booking: !!booking, 
                user: !!booking?.user, 
                show: !!booking?.show, 
                movie: !!booking?.show?.movie 
            });
            return { success: false, message: "Booking data incomplete" };
        }

        // Ensure booking is paid before sending confirmation email
        if (!booking.isPaid) {
            console.error(`[Email Function] Booking ${bookingId} is not paid. Email not sent. Current status: isPaid=${booking.isPaid}`);
            // Wait a bit and retry - sometimes the payment status update hasn't propagated
            await step.sleep('wait-for-payment-status', '2s');
            
            // Re-fetch booking to check payment status again
            const recheckBooking = await step.run('recheck-booking-payment', async () => {
                return await Booking.findById(bookingId).select('isPaid');
            });
            
            if (!recheckBooking || !recheckBooking.isPaid) {
                console.error(`[Email Function] Booking ${bookingId} still not paid after retry. Email not sent.`);
                return { success: false, message: "Booking is not paid yet" };
            }
            console.log(`[Email Function] Booking ${bookingId} is now paid after retry. Proceeding with email.`);
        }

        // Format date and time
        const showDate = new Date(booking.show.showDateTime);
        const formattedDate = showDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Kolkata' 
        });
        const formattedTime = showDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata' 
        });

        // Format seats
        const seatsList = booking.bookedSeats.sort().join(', ');
        const currency = process.env.VITE_CURRENCY || process.env.CURRENCY || '₹';

        // Create professional email template
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #F84565 0%, #d63656 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🎬 Booking Confirmed!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                                Hi <strong>${booking.user.name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                                Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> has been confirmed! 
                                Please keep this email as your booking confirmation.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e0e0e0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333333; border-bottom: 2px solid #F84565; padding-bottom: 10px;">
                                            Booking Details
                                        </h2>
                                        
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;"><strong>Movie:</strong></td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${booking.show.movie.title}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Date:</strong></td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formattedDate}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Time:</strong></td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formattedTime}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Seats:</strong></td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${seatsList}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Number of Tickets:</strong></td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px;">${booking.bookedSeats.length}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Total Amount:</strong></td>
                                                <td style="padding: 8px 0; color: #F84565; font-size: 18px; font-weight: 700;">${currency}${booking.amount.toFixed(2)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Confirmation Token Card -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #F84565 0%, #d63656 100%); border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                            Booking Confirmation Number
                                        </p>
                                        <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                                            ${booking.bookingToken || 'N/A'}
                                        </p>
                                        <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 12px; opacity: 0.9;">
                                            Please save this number as proof of your booking
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Important Notice -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                                    <strong>📋 Important:</strong> Please arrive at least 15 minutes before the show time. 
                                    Present this confirmation number at the theater for entry.
                                </p>
                            </div>

                            <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">
                                Enjoy your show! 🍿🎬
                            </p>
                            
                            <p style="margin: 20px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                                Thanks for booking with us!<br/>
                                <strong style="color: #F84565;">— ShowSphere Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                This is an automated confirmation email. Please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        await step.run('send-email', async () => {
            try {
                const recipientEmail = booking.user.email;
                console.log(`[Email Function] Sending confirmation email to ${recipientEmail} for booking ${bookingId}`);
                
                const emailResult = await sendEmail({
                    to: recipientEmail,
                    subject: `🎬 Booking Confirmed: "${booking.show.movie.title}" - ${booking.bookingToken || 'Confirmation'}`,
                    body: emailBody
                });
                
                console.log(`[Email Function] Email sent successfully for booking ${bookingId}`);
                console.log(`[Email Function] Email result:`, {
                    messageId: emailResult.messageId,
                    accepted: emailResult.accepted,
                    rejected: emailResult.rejected,
                    response: emailResult.response
                });
                
                return emailResult;
            } catch (emailError) {
                console.error(`[Email Function] Failed to send email for booking ${bookingId}:`, emailError);
                console.error(`[Email Function] Email error details:`, {
                    message: emailError.message,
                    stack: emailError.stack,
                    code: emailError.code,
                    command: emailError.command
                });
                throw emailError;
            }
        });

        console.log(`[Email Function] Successfully completed email sending for booking ${bookingId}`);
        return { success: true, message: `Confirmation email sent to ${booking.user.email}` };
    }
)


// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
    {id: "send-show-reminders"},
    { cron: "0 */8 * * *" }, // Every 8 hours
    async ({ step })=>{
        const now = new Date();
        const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

        // Prepare reminder tasks
        const reminderTasks =  await step.run("prepare-reminder-tasks", async ()=>{
            const shows = await Show.find({
                showTime: { $gte: windowStart, $lte: in8Hours },
            }).populate('movie');

            const tasks = [];

            for(const show of shows){
                if(!show.movie || !show.occupiedSeats) continue;

                const userIds = [...new Set(Object.values(show.occupiedSeats))];
                if(userIds.length === 0) continue;

                const users = await User.find({_id: {$in: userIds}}).select("name email");

                for(const user of users){
                    tasks.push({
                        userEmail: user.email,
                        userName: user.name,
                        movieTitle: show.movie.title,
                        showTime: show.showTime,
                    })
                }
            }
            return tasks;
        })

        if(reminderTasks.length === 0){
            return {sent: 0, message: "No reminders to send."}
        }

         // Send reminder emails
         const results = await step.run('send-all-reminders', async ()=>{
            return await Promise.allSettled(
                reminderTasks.map(task => sendEmail({
                    to: task.userEmail,
                    subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
                     body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Hello ${task.userName},</h2>
                            <p>This is a quick reminder that your movie:</p>
                            <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
                            <p>
                                is scheduled for <strong>${new Date(task.showTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</strong> at 
                                <strong>${new Date(task.showTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}</strong>.
                            </p>
                            <p>It starts in approximately <strong>8 hours</strong> - make sure you're ready!</p>
                            <br/>
                            <p>Enjoy the show!<br/>ShowSphere Team</p>
                        </div>`
                }))
            )
         })

         const sent = results.filter(r => r.status === "fulfilled").length;
         const failed = results.length - sent;

         return {
            sent,
            failed,
            message: `Sent ${sent} reminder(s), ${failed} failed.`
         }
    }
)

// Inngest Function to send notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
    {id: "send-new-show-notifications"},
    { event: "app/show.added" },
    async ({ event })=>{
        const { movieTitle } = event.data;

        const users =  await User.find({})

        for(const user of users){
            const userEmail = user.email;
            const userName = user.name;

            const subject = `🎬 New Show Added: ${movieTitle}`;
            const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Hi ${userName},</h2>
                    <p>We've just added a new show to our library:</p>
                    <h3 style="color: #F84565;">"${movieTitle}"</h3>
                    <p>Visit our website</p>
                    <br/>
                    <p>Thanks,<br/>ShowSphere Team</p>
                </div>`;

                await sendEmail({
                    to: userEmail,
                    subject,
                    body,
                })
        }

        return {message: "Notifications sent." }
        
    }
)


// Periodic cleanup function to remove expired unpaid bookings (runs every 5 minutes)
// IMPORTANT: Only UNPAID bookings are removed. Paid bookings are kept FOREVER.
const cleanupExpiredBookings = inngest.createFunction(
    {id: "cleanup-expired-bookings"},
    { cron: "*/5 * * * *" }, // Every 5 minutes
    async ({ step })=>{
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        const result = await step.run('cleanup-expired-unpaid-bookings', async ()=>{
            // Find all UNPAID bookings older than 10 minutes
            // Paid bookings are NEVER deleted, they stay in the database forever
            const expiredBookings = await Booking.find({
                isPaid: false, // Only unpaid bookings
                createdAt: { $lt: tenMinutesAgo }
            }).populate('show');

            let cleaned = 0;
            let errors = 0;

            for (const booking of expiredBookings) {
                try {
                    // Release seats
                    if (booking.show) {
                        booking.bookedSeats.forEach((seat) => {
                            delete booking.show.occupiedSeats[seat];
                        });
                        booking.show.markModified('occupiedSeats');
                        await booking.show.save();
                    }
                    
                    // Delete booking
                    await Booking.findByIdAndDelete(booking._id);
                    cleaned++;
                } catch (error) {
                    console.error(`Error cleaning up booking ${booking._id}:`, error);
                    errors++;
                }
            }

            return {
                cleaned,
                errors,
                message: `Cleaned up ${cleaned} expired booking(s), ${errors} error(s)`
            };
        });

        return result;
    }
)

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    sendShowReminders,
    sendNewShowNotifications,
    cleanupExpiredBookings
];