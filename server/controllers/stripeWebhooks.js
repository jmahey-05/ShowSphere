import stripe from "stripe";
import Booking from '../models/Booking.js'
import { inngest } from "../inngest/index.js";

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
            case "payment_intent.succeeded": {
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

                // Send Confirmation Email - ensure bookingId is a string
                try {
                    const bookingIdString = String(bookingId);
                    const eventId = `booking-email-${bookingIdString}-${Date.now()}`;
                    console.log(`Triggering email event for booking: ${bookingIdString} with event ID: ${eventId}`);
                    
                    const eventResult = await inngest.send({
                        id: eventId, // Unique event ID to prevent deduplication
                        name: "app/show.booked",
                        data: {bookingId: bookingIdString}
                    });
                    
                    console.log(`Email event triggered successfully for booking: ${bookingIdString}`, eventResult);
                } catch (emailError) {
                    // Log error but don't fail the webhook - payment is already processed
                    console.error(`Failed to trigger email for booking ${bookingId}:`, emailError);
                    console.error('Email error details:', {
                        message: emailError.message,
                        stack: emailError.stack,
                        name: emailError.name
                    });
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