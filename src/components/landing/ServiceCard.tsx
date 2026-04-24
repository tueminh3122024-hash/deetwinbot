'use client'

import { motion } from 'framer-motion'
import { Stethoscope } from 'lucide-react'

interface Service {
    id: string
    name: string
    description: string
}

export default function ServiceCard({ service, index }: { service: Service; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="relative group p-6 rounded-2xl bg-[#0d0d0d] border border-gray-800 hover:border-[#00D1FF]/50 transition-all duration-300 overflow-hidden"
        >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4 border border-gray-800 group-hover:border-[#00D1FF]/30 transition-colors">
                    <Stethoscope size={24} className="text-[#00D1FF]" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00D1FF] transition-colors">
                    {service.name}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                    {service.description || 'Dịch vụ chăm sóc sức khỏe chất lượng cao từ DeeTwin Clinic.'}
                </p>
            </div>

            {/* Bottom Glow Line */}
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#00D1FF] to-[#39FF14] group-hover:w-full transition-all duration-500" />
        </motion.div>
    )
}
