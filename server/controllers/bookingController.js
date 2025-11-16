import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import stripe from 'stripe'
import { sendBookingEmailDirectly } from "../utils/sendBookingEmail.js";


// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats)=>{
    try {
        const showData = await Show.findById(showId)
        if(!showData) return false;

        const occupiedSeats = showData.occupiedSeats;

        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);

        return !isAnySeatTaken;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res)=>{
    try {
        console.log('=== Booking Creation Started ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        
        // Check authentication
        let userId;
        try {
            console.log('Checking authentication...');
            const authResult = req.auth();
            console.log('Auth result:', authResult);
            userId = authResult?.userId;
            console.log('User ID:', userId);
            if (!userId) {
                console.error('No userId found in auth result');
                return res.status(401).json({success: false, message: "Authentication required. Please login to proceed."});
            }
        } catch (authError) {
            console.error('Authentication error:', authError);
            console.error('Auth error stack:', authError.stack);
            return res.status(401).json({success: false, message: "Authentication failed. Please login again."});
        }

        const {showId, selectedSeats} = req.body;
        console.log('Show ID:', showId);
        console.log('Selected Seats:', selectedSeats);
        const origin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
        console.log('Origin:', origin);

        // Input validation
        if (!showId) {
            return res.status(400).json({success: false, message: "Show ID is required"});
        }
        if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            return res.status(400).json({success: false, message: "At least one seat must be selected"});
        }
        if (selectedSeats.length > 10) {
            return res.status(400).json({success: false, message: "Maximum 10 seats can be booked at once"});
        }

        // Check if the seat is available for the selected show
        console.log('Checking seat availability...');
        const isAvailable = await checkSeatsAvailability(showId, selectedSeats)
        console.log('Seats available:', isAvailable);

        if(!isAvailable){
            return res.status(409).json({success: false, message: "Selected Seats are not available."})
        }

        // Get the show details
        console.log('Fetching show data...');
        const showData = await Show.findById(showId).populate('movie');
        console.log('Show data found:', !!showData);
        
        if (!showData) {
            return res.status(404).json({success: false, message: "Show not found"});
        }
        
        if (!showData.movie) {
            return res.status(404).json({success: false, message: "Movie not found for this show"});
        }

        // Validate show price
        console.log('Show price:', showData.showPrice);
        if (!showData.showPrice || isNaN(showData.showPrice) || showData.showPrice <= 0) {
            console.error('Invalid show price:', showData.showPrice);
            return res.status(500).json({success: false, message: "Show price is not set. Please contact support."});
        }

        // Calculate booking amount
        const bookingAmount = showData.showPrice * selectedSeats.length;
        console.log('Booking amount:', bookingAmount);
        if (isNaN(bookingAmount) || bookingAmount <= 0) {
            console.error('Invalid booking amount calculated:', bookingAmount);
            return res.status(500).json({success: false, message: "Invalid booking amount. Please try again."});
        }

        // Generate unique booking token
        const generateBookingToken = () => {
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            return `BK-${timestamp}-${randomStr}`;
        };
        
        const bookingToken = generateBookingToken();
        console.log('Generated booking token:', bookingToken);

        // Create a new booking
        console.log('Creating booking...');
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: bookingAmount,
            bookedSeats: selectedSeats,
            bookingToken: bookingToken
        })
        console.log('Booking created:', booking._id);

        selectedSeats.map((seat)=>{
            showData.occupiedSeats[seat] = userId;
        })

        showData.markModified('occupiedSeats');

        await showData.save();
        console.log('Show seats updated');

         // Check if Stripe is configured
         console.log('Checking Stripe configuration...');
         console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
         if (!process.env.STRIPE_SECRET_KEY) {
            // If Stripe is not configured, mark booking as paid and redirect to success
            booking.isPaid = true;
            booking.paymentLink = "";
            await booking.save();
            
            // Send confirmation email when booking is marked as paid (without Stripe)
            const bookingIdString = booking._id.toString();
            let emailSent = false;

            // Try Inngest first
            try {
                const eventId = `booking-email-${bookingIdString}-${Date.now()}`;
                console.log(`[Booking] Attempting to trigger email via Inngest for booking (no Stripe): ${bookingIdString} with event ID: ${eventId}`);
                
                const eventResult = await inngest.send({
                    id: eventId,
                    name: "app/show.booked",
                    data: {bookingId: bookingIdString}
                });
                
                console.log(`[Booking] Inngest event triggered successfully (no Stripe) for booking: ${bookingIdString}`, eventResult);
                emailSent = true;
            } catch (inngestError) {
                console.error('[Booking] Inngest failed (no Stripe):', inngestError.message);
                console.error('[Booking] Inngest error details:', {
                    message: inngestError.message,
                    stack: inngestError.stack,
                    name: inngestError.name
                });
            }

            // Fallback to direct email if Inngest failed
            if (!emailSent) {
                console.log(`[Booking] Falling back to direct email send for booking (no Stripe): ${bookingIdString}`);
                try {
                    const directEmailResult = await sendBookingEmailDirectly(bookingIdString);
                    if (directEmailResult.success) {
                        console.log(`[Booking] Direct email sent successfully (no Stripe) for booking: ${bookingIdString}`);
                        emailSent = true;
                    } else {
                        console.error(`[Booking] Direct email also failed (no Stripe) for booking ${bookingIdString}:`, directEmailResult.message);
                    }
                } catch (directEmailError) {
                    console.error(`[Booking] Direct email error (no Stripe) for booking ${bookingIdString}:`, directEmailError);
                }
            }

            if (!emailSent) {
                console.error(`[Booking] WARNING: Email could not be sent for booking ${bookingIdString} (no Stripe) via any method`);
            }
            
            return res.status(201).json({
                success: true, 
                url: `${origin}/loading/my-bookings?success=true&message=Booking confirmed successfully!`
            });
         }

         // Validate Stripe API key format
         console.log('Validating Stripe API key format...');
         const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
         console.log('Stripe key length:', stripeKey.length);
         console.log('Stripe key starts with sk_test_:', stripeKey.startsWith('sk_test_'));
         console.log('Stripe key starts with sk_live_:', stripeKey.startsWith('sk_live_'));
         
         if (!stripeKey || (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_'))) {
            console.error('Invalid Stripe API key format. Key should start with sk_test_ or sk_live_');
            console.error('Key value (first 10 chars):', stripeKey.substring(0, 10));
            return res.status(500).json({
                success: false, 
                message: "Invalid Stripe API key format. Please check your environment variables."
            });
         }

         // Stripe Gateway Initialize
         let stripeInstance;
         try {
            stripeInstance = new stripe(stripeKey);
         } catch (stripeError) {
            console.error('Error initializing Stripe:', stripeError.message);
            return res.status(500).json({
                success: false, 
                message: "Failed to initialize payment gateway. Please contact support."
            });
         }

         // Get currency from environment variable or default to INR
         // Map currency symbols/codes to Stripe currency codes
         const currencyEnv = process.env.CURRENCY || process.env.STRIPE_CURRENCY || 'inr';
         const currencyMap = {
            '₹': 'inr',
            'inr': 'inr',
            'INR': 'inr',
            '$': 'usd',
            'usd': 'usd',
            'USD': 'usd',
            '€': 'eur',
            'eur': 'eur',
            'EUR': 'eur',
            '£': 'gbp',
            'gbp': 'gbp',
            'GBP': 'gbp'
         };
         const stripeCurrency = currencyMap[currencyEnv.toLowerCase()] || currencyMap[currencyEnv] || 'inr'; // Default to INR
         console.log('Currency from env:', currencyEnv);
         console.log('Stripe currency:', stripeCurrency);

         // Creating line items to for Stripe
         const line_items = [{
            price_data: {
                currency: stripeCurrency,
                product_data:{
                    name: showData.movie.title
                },
                unit_amount: Math.floor(booking.amount) * 100
            },
            quantity: 1
         }]

         let session;
         try {
            session = await stripeInstance.checkout.sessions.create({
                success_url: `${origin}/loading/my-bookings`,
                cancel_url: `${origin}/my-bookings`,
                line_items: line_items,
                mode: 'payment',
                metadata: {
                    bookingId: booking._id.toString()
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
            });
         } catch (stripeError) {
            console.error('Stripe API Error:', stripeError.message);
            console.error('Stripe Error Type:', stripeError.type);
            console.error('Stripe Error Code:', stripeError.code);
            
            // Provide more specific error messages
            let errorMessage = "Payment gateway error. Please try again.";
            if (stripeError.type === 'StripeAuthenticationError') {
                errorMessage = "Invalid Stripe API key. Please check your environment variables.";
            } else if (stripeError.type === 'StripeAPIError') {
                errorMessage = `Stripe API error: ${stripeError.message}`;
            } else if (stripeError.message) {
                errorMessage = `Payment error: ${stripeError.message}`;
            }
            
            return res.status(500).json({
                success: false, 
                message: errorMessage
            });
         }

         booking.paymentLink = session.url
         await booking.save()

         // Run Inngest Sheduler Function to check payment status after 10 minutes
         try {
            await inngest.send({
                name: "app/checkpayment",
                data: {
                    bookingId: booking._id.toString()
                }
            });
         } catch (inngestError) {
            // Log but don't fail the booking if Inngest fails
            console.error('Inngest error (non-critical):', inngestError.message);
         }

         res.status(201).json({success: true, url: session.url})

    } catch (error) {
        console.error('Booking creation error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        // Provide more specific error messages
        let errorMessage = "An error occurred while creating your booking. Please try again.";
        
        if (error.name === 'ValidationError') {
            errorMessage = "Invalid booking data. Please check your selections and try again.";
        } else if (error.name === 'CastError') {
            errorMessage = "Invalid show ID. Please try selecting seats again.";
        } else if (error.message && error.message.includes('STRIPE') || error.message.includes('stripe')) {
            errorMessage = "Payment gateway configuration error. Please contact support.";
        } else if (error.message && (error.message.includes('Show') || error.message.includes('show'))) {
            errorMessage = "Show not available. Please try another show.";
        } else if (error.message && (error.message.includes('seat') || error.message.includes('Seat'))) {
            errorMessage = "Seat selection error. Please try again.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({success: false, message: errorMessage})
    }
}

export const getOccupiedSeats = async (req, res)=>{
    try {
        
        const {showId} = req.params;
        
        if (!showId) {
            return res.status(400).json({success: false, message: "Show ID is required"});
        }
        
        const showData = await Show.findById(showId)
        
        if (!showData) {
            return res.status(404).json({success: false, message: "Show not found"});
        }

        const occupiedSeats = Object.keys(showData.occupiedSeats || {})

        res.json({success: true, occupiedSeats})

    } catch (error) {
        console.log(error.message);
        res.status(500).json({success: false, message: error.message})
    }
}