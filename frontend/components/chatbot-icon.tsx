// frontend/components/chatbot-icon.tsx
export function ChatbotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      aria-label="Chatbot Icon"
    >
      {/* Left Ear */}
      <rect x="32" y="180" width="45" height="100" rx="22" fill="#42B5FF" />
      {/* Right Ear */}
      <rect x="435" y="180" width="45" height="100" rx="22" fill="#3C79EA" />
      {/* Antenna */}
      <line x1="256" y1="55" x2="256" y2="130" stroke="#3C79EA" strokeWidth="6" />
      <circle cx="256" cy="45" r="22" fill="#42B5FF" />
      {/* Robot Head */}
      <rect x="70" y="105" width="372" height="280" rx="90" fill="#D9D9D9" />
      {/* Center Divider */}
      <rect x="254" y="105" width="4" height="310" fill="#C7C7C7" />
      {/* Face */}
      <rect x="112" y="150" width="288" height="175" rx="45" fill="#112453" />
      {/* Shine */}
      <polygon points="112,250 210,150 235,150 135,280" fill="#2A4E96" opacity=".35" />
      <polygon points="170,325 300,195 325,195 195,325" fill="#2A4E96" opacity=".25" />
      {/* Eyes */}
      <rect x="165" y="195" width="42" height="80" rx="21" fill="#42B5FF" />
      <rect x="305" y="195" width="42" height="80" rx="21" fill="#42B5FF" />
      {/* Bottom Pointer */}
      <polygon points="256,385 290,415 256,430" fill="#D9D9D9" />
      {/* Neck */}
      <rect x="220" y="385" width="72" height="18" rx="9" fill="#BEBEBE" />
      {/* Chat Bubble */}
      <g transform="translate(330 25)">
        <ellipse cx="62" cy="40" rx="80" ry="50" fill="#D9D9D9" />
        <polygon points="50,80 70,60 75,85" fill="#D9D9D9" />
        <circle cx="20" cy="40" r="12" fill="#203A7A" />
        <circle cx="62" cy="40" r="12" fill="#203A7A" />
        <circle cx="104" cy="40" r="12" fill="#203A7A" />
      </g>
    </svg>
  );
}