import React from 'react'
import BlurCircle from '../components/BlurCircle'
import { Shield, Lock, Eye, FileText } from 'lucide-react'

const PrivacyPolicy = () => {
  return (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
      <BlurCircle top="150px" left="0px"/>
      <BlurCircle bottom="50px" right="50px"/>

      <div className='max-w-4xl mx-auto'>
        <div className='text-center mb-12'>
          <Shield className='w-16 h-16 text-primary mx-auto mb-4'/>
          <h1 className='text-4xl font-bold mb-4'>Privacy Policy</h1>
          <p className='text-gray-400 text-lg'>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className='space-y-8'>
          <div className='bg-gray-800 rounded-2xl p-8'>
            <div className='flex items-center gap-3 mb-4'>
              <FileText className='w-6 h-6 text-primary'/>
              <h2 className='text-2xl font-semibold'>Introduction</h2>
            </div>
            <p className='text-gray-300 leading-relaxed'>
              At ShowSphere, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our movie booking platform. 
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy 
              policy, please do not access the site.
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <div className='flex items-center gap-3 mb-4'>
              <Eye className='w-6 h-6 text-primary'/>
              <h2 className='text-2xl font-semibold'>Information We Collect</h2>
            </div>
            <p className='text-gray-300 leading-relaxed mb-4'>
              We collect information that you provide directly to us, including:
            </p>
            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
              <li>Account information (name, email address, phone number)</li>
              <li>Booking history and preferences</li>
              <li>Payment information (processed securely through third-party payment processors)</li>
              <li>Communication preferences</li>
            </ul>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <div className='flex items-center gap-3 mb-4'>
              <Lock className='w-6 h-6 text-primary'/>
              <h2 className='text-2xl font-semibold'>How We Use Your Information</h2>
            </div>
            <p className='text-gray-300 leading-relaxed mb-4'>
              We use the information we collect to:
            </p>
            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
              <li>Process and manage your bookings</li>
              <li>Send booking confirmations and updates</li>
              <li>Improve our services and user experience</li>
              <li>Send promotional offers and movie recommendations (with your consent)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>Data Security</h2>
            <p className='text-gray-300 leading-relaxed'>
              We implement appropriate technical and organizational security measures to protect your 
              personal information. However, no method of transmission over the Internet or electronic 
              storage is 100% secure. While we strive to use commercially acceptable means to protect 
              your information, we cannot guarantee absolute security.
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>Third-Party Services</h2>
            <p className='text-gray-300 leading-relaxed'>
              We may use third-party services for payment processing, analytics, and other functions. 
              These third parties have access to your information only to perform specific tasks on our 
              behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>Your Rights</h2>
            <p className='text-gray-300 leading-relaxed mb-4'>
              You have the right to:
            </p>
            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
              <li>Access and update your personal information</li>
              <li>Request deletion of your account and data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </div>

          <div className='bg-gray-800 rounded-2xl p-8'>
            <h2 className='text-2xl font-semibold mb-4'>Contact Us</h2>
            <p className='text-gray-300 leading-relaxed'>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className='text-gray-300 mt-2'>
              Email: privacy@showsphere.com<br/>
              Phone: +91 98765 43210
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

