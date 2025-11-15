import React from 'react'
import BlurCircle from '../components/BlurCircle'
import { Film, Users, Award, Heart } from 'lucide-react'

const About = () => {
  return (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
      <BlurCircle top="150px" left="0px"/>
      <BlurCircle bottom="50px" right="50px"/>

      <div className='max-w-4xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold mb-4'>About ShowSphere</h1>
          <p className='text-gray-400 text-lg'>
            Your premier destination for the ultimate movie experience
          </p>
        </div>

        <div className='space-y-8 mb-12'>
          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>Our Story</h2>
            <p className='text-gray-300 leading-relaxed'>
              ShowSphere was founded with a simple mission: to make movie booking effortless and enjoyable. 
              We believe that watching movies should be a seamless experience from discovery to booking. 
              Our platform brings together the latest releases, convenient showtimes, and easy ticket booking 
              all in one place.
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>What We Offer</h2>
            <p className='text-gray-300 leading-relaxed mb-4'>
              At ShowSphere, we provide a comprehensive movie booking experience:
            </p>
            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
              <li>Browse the latest movies and upcoming releases</li>
              <li>Real-time seat selection and booking</li>
              <li>Secure payment processing</li>
              <li>Personalized favorites and booking history</li>
              <li>Multiple theater locations</li>
            </ul>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-12'>
          <div className='bg-gray-800 rounded-2xl p-6 text-center'>
            <Film className='w-12 h-12 text-primary mx-auto mb-4'/>
            <h3 className='text-xl font-semibold mb-2'>Wide Selection</h3>
            <p className='text-gray-400'>
              Access to the latest blockbusters and indie films
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-6 text-center'>
            <Users className='w-12 h-12 text-primary mx-auto mb-4'/>
            <h3 className='text-xl font-semibold mb-2'>User-Friendly</h3>
            <p className='text-gray-400'>
              Intuitive interface designed for easy navigation
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-6 text-center'>
            <Award className='w-12 h-12 text-primary mx-auto mb-4'/>
            <h3 className='text-xl font-semibold mb-2'>Quality Service</h3>
            <p className='text-gray-400'>
              Committed to providing the best movie experience
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-6 text-center'>
            <Heart className='w-12 h-12 text-primary mx-auto mb-4'/>
            <h3 className='text-xl font-semibold mb-2'>Customer First</h3>
            <p className='text-gray-400'>
              Your satisfaction is our top priority
            </p>
          </div>
        </div>

        <div className='bg-gray-800 rounded-2xl p-8 text-center'>
          <h2 className='text-2xl font-semibold mb-4'>Join Us</h2>
          <p className='text-gray-300 leading-relaxed'>
            Experience the future of movie booking. Join thousands of movie lovers who trust ShowSphere 
            for their entertainment needs. Book your next movie experience with us today!
          </p>
        </div>
      </div>
    </div>
  )
}

export default About

