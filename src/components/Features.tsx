import { Zap, Shield, Globe, Clock, Infinity, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: <Zap size={24} className="text-amber-400" />,
    title: 'Lightning Fast',
    description: 'Upload and share your files instantly with blazing fast speeds.',
  },
  {
    icon: <Shield size={24} className="text-green-400" />,
    title: 'Secure Storage',
    description: 'Your files are stored securely and accessible only via your unique link.',
  },
  {
    icon: <Globe size={24} className="text-blue-400" />,
    title: 'Global Access',
    description: 'Access your files from anywhere in the world, anytime.',
  },
  {
    icon: <Clock size={24} className="text-pink-400" />,
    title: 'Always Available',
    description: 'Your files stay online permanently unless you choose to remove them.',
  },
  {
    icon: <Infinity size={24} className="text-cyan-400" />,
    title: 'Unlimited Uploads',
    description: 'No restrictions on the number of files you can upload.',
  },
  {
    icon: <Lock size={24} className="text-purple-400" />,
    title: 'No Account Needed',
    description: 'Start uploading immediately without creating an account.',
  },
];

export default function Features() {
  return (
    <div id="features" className="w-full py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Why choose <span className="text-gradient">DropZone</span>?
        </h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Simple, fast, and reliable file hosting for everyone.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass rounded-xl p-6 hover:border-primary/20 transition-colors group"
          >
            <div className="p-3 bg-secondary rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
