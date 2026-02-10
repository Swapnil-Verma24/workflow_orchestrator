import React, { useState } from 'react';

const Tooltip = ({ children, content, shortcut, position = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`absolute ${positions[position]} z-50 animate-in fade-in duration-200`}>
                    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                        <div className="font-medium">{content}</div>
                        {shortcut && (
                            <div className="mt-1 text-[10px] text-slate-400 font-mono">
                                {shortcut}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
