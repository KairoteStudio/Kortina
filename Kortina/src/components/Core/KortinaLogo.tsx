import React from 'react';
interface KortinaLogoProps {
  size?: number;
  className?: string;
}
export const KortinaLogo: React.FC<KortinaLogoProps> = ({
  size = 20,
  className
}) => {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#60CDFF" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="#60CDFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M2 12l10 5 10-5" stroke="#4EC9B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>;
};
export default KortinaLogo;