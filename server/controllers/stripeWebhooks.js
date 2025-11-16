import stripe from "stripe";
import Booking from '../models/Booking.js'
import { inngest } from "../inngest/index.js";
import { sendBookingEmailDirectly } from "../utils/sendBookingEmail.js";

export const stripeWebhooks = async (request, response)=>{
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers["stripe-signature"];

    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (error) {
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                })

                const session = sessionList.data[0];
                const { bookingId } = session.metadata;

                if (!bookingId) {
                    console.error("No bookingId found in session metadata");
                    break;
                }

                // Update booking to mark as paid
                const updatedBooking = await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink: ""
                }, { new: true });

                if (!updatedBooking) {
                    console.error(`Booking not found: ${bookingId}`);
                    break;
                }

                console.log(`Payment successful for booking: ${bookingId}`);

                // Send Confirmation Email - try Inngest first, fallback to direct send
                const bookingIdString = String(bookingId);
                let emailSent = false;

                // Try Inngest first
                try {
                    const eventId = `booking-email-${bookingIdString}-${Date.now()}`;
                    console.log(`[Webhook] Attempting to trigger email via Inngest for booking: ${bookingIdString} with event ID: ${eventId}`);
                    
                    const eventResult = await inngest.send({
                        id: eventId,
                        name: "app/show.booked",
                        data: {bookingId: bookingIdString}
                    });
                    
                    console.log(`[Webhook] Inngest event triggered successfully for booking: ${bookingIdString}`, eventResult);
                    emailSent = true;
                } catch (inngestError) {
                    console.error(`[Webhook] Inngest failed for booking ${bookingIdString}:`, inngestError.message);
                    console.error('[Webhook] Inngest error details:', {
                        message: inngestError.message,
                        stack: inngestError.stack,
                        name: inngestError.name
                    });
                }

                // Fallback to direct email if Inngest failed
                if (!emailSent) {
                    console.log(`[Webhook] Falling back to direct email send for booking: ${bookingIdString}`);
                    try {
                        const directEmailResult = await sendBookingEmailDirectly(bookingIdString);
                        if (directEmailResult.success) {
                            console.log(`[Webhook] Direct email sent successfully for booking: ${bookingIdString}`);
                            emailSent = true;
                        } else {
                            console.error(`[Webhook] Direct email also failed for booking ${bookingIdString}:`, directEmailResult.message);
                        }
                    } catch (directEmailError) {
                        console.error(`[Webhook] Direct email error for booking ${bookingIdString}:`, directEmailError);
                    }
                }

                if (!emailSent) {
                    console.error(`[Webhook] WARNING: Email could not be sent for booking ${bookingIdString} via any method`);
                }
                
                break;
            }
        
            default:
                console.log('Unhandled event type:', event.type)
        }
        response.json({received: true})
    } catch (err) {
        console.error("Webhook processing error:", err);
        response.status(500).send("Internal Server Error");
    }
}