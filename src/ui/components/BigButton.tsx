export default function BigButton({
    label, onClick, className, disabled
}: { label: string; onClick: () => void; className?: string, disabled?: boolean }) {
    return <button className={`button ${className || ''}`} onClick={onClick} disabled={disabled}>{label}</button>;
}
