import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-36 mt-40 w-full text-gray-300">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-500 pb-14">
        <div className="md:max-w-96">
          <img className="w-36 h-auto" src={assets.logo} alt="logo" />
          <p className="mt-6 text-sm text-gray-400 leading-relaxed">
            ShowSphere is your premier destination for booking movie tickets. Experience the latest 
            blockbusters with ease and convenience. Book your favorite movies in just a few clicks.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <img src={assets.googlePlay} alt="google play" className="h-9 w-auto cursor-pointer hover:opacity-80 transition" />
            <img src={assets.appStore} alt="app store" className="h-9 w-auto cursor-pointer hover:opacity-80 transition" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row items-start md:justify-end gap-12 md:gap-20">
          <div>
            <h2 className="font-semibold mb-5 text-white">Company</h2>
            <ul className="text-sm space-y-3">
              <li>
                <Link to="/" className="hover:text-primary transition">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition">About Us</Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-primary transition">Privacy Policy</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h2 className="font-semibold mb-5 text-white">Get in Touch</h2>
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-primary transition">
                  +91 98765 43210
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="tel:+919876543211" className="hover:text-primary transition">
                  +91 98765 43211
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="mailto:support@showsphere.com" className="hover:text-primary transition">
                  support@showsphere.com
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">
                  123 Entertainment Street<br/>
                  Movie City, MC 12345
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <p className="pt-4 text-center text-sm pb-5 text-gray-400">
        Copyright {new Date().getFullYear()} © ShowSphere. All Rights Reserved.
      </p>
    </footer>
  )
}

export default Footer

