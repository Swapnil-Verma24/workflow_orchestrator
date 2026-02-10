import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle2 size={20} className="text-emerald-500" />,
        error: <XCircle size={20} className="text-rose-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200',
        error: 'bg-rose-50 border-rose-200',
        info: 'bg-blue-50 border-blue-200'
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColors[type]} shadow-lg animate-in slide-in-from-top-2 duration-300`}>
            {icons[type]}
            <p className="flex-1 text-sm font-medium text-slate-700">{message}</p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-white/50 rounded-full transition-colors"
            >
                <X size={16} className="text-slate-400" />
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-24 right-6 z-50 space-y-2 max-w-md">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                    duration={toast.duration}
                />
            ))}
        </div>
    );
};

export { Toast, ToastContainer };
export default ToastContainer;
