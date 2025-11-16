import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

/**
 * Direct email sending function (fallback when Inngest fails)
 */
export const sendBookingEmailDirectly = async (bookingId) => {
    try {
        console.log(`[Direct Email] Starting direct email send for booking: ${bookingId}`);
        
        // Fetch booking with all required data
        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: {path: "movie", model: "Movie"}
        }).populate('user');

        if (!booking) {
            console.error(`[Direct Email] Booking not found: ${bookingId}`);
            return { success: false, message: "Booking not found" };
        }

        if (!booking.user || !booking.show || !booking.show.movie) {
            console.error('[Direct Email] Booking data incomplete');
            return { success: false, message: "Booking data incomplete" };
        }

        if (!booking.isPaid) {
            console.error(`[Direct Email] Booking ${bookingId} is not paid`);
            return { success: false, message: "Booking is not paid yet" };
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
        const seatsList = Array.isArray(booking.bookedSeats) 
            ? booking.bookedSeats.sort().join(', ')
            : 'N/A';
        const currency = process.env.VITE_CURRENCY || process.env.CURRENCY || '₹';

        // Create email template
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
                    <tr>
                        <td style="background: linear-gradient(135deg, #F84565 0%, #d63656 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🎬 Booking Confirmed!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                                Hi <strong>${booking.user.name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                                Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> has been confirmed! 
                                Please keep this email as your booking confirmation.
                            </p>
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e0e0e0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333333; border-bottom: 2px solid #F84565; padding-bottom: 10px;">Booking Details</h2>
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
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px;">${Array.isArray(booking.bookedSeats) ? booking.bookedSeats.length : 0}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Total Amount:</strong></td>
                                                <td style="padding: 8px 0; color: #F84565; font-size: 18px; font-weight: 700;">${currency}${booking.amount.toFixed(2)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #F84565 0%, #d63656 100%); border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Booking Confirmation Number</p>
                                        <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 2px; font-family: 'Courier New', monospace;">${booking.bookingToken || 'N/A'}</p>
                                        <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 12px; opacity: 0.9;">Please save this number as proof of your booking</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                                    <strong>📋 Important:</strong> Please arrive at least 15 minutes before the show time. 
                                    Present this confirmation number at the theater for entry.
                                </p>
                            </div>
                            <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">Enjoy your show! 🍿🎬</p>
                            <p style="margin: 20px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                                Thanks for booking with us!<br/>
                                <strong style="color: #F84565;">— ShowSphere Team</strong>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 12px; color: #999999;">This is an automated confirmation email. Please do not reply to this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        // Send email directly
        const emailResult = await sendEmail({
            to: booking.user.email,
            subject: `🎬 Booking Confirmed: "${booking.show.movie.title}" - ${booking.bookingToken || 'Confirmation'}`,
            body: emailBody
        });

        console.log(`[Direct Email] Email sent successfully to ${booking.user.email} for booking ${bookingId}`);
        console.log(`[Direct Email] Email result:`, {
            messageId: emailResult.messageId,
            accepted: emailResult.accepted,
            rejected: emailResult.rejected
        });

        return { success: true, message: `Email sent to ${booking.user.email}` };
    } catch (error) {
        console.error(`[Direct Email] Failed to send email for booking ${bookingId}:`, error);
        console.error(`[Direct Email] Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return { success: false, message: error.message };
    }
};

