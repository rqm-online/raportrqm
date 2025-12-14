import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ScoreInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export function ScoreInput({ label, value, onChange, min = 10, max = 100, disabled = false }: ScoreInputProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <Label className="flex-1">{label}</Label>
            <Input
                type="number"
                min={min}
                max={max}
                step={1}
                className="w-20 text-right [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                value={value === 0 ? '' : value}
                disabled={disabled}
                onFocus={(e) => {
                    // Auto-select all text when input is clicked
                    e.target.select();
                }}
                onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                        onChange(0); // Use 0 or min, but 0 allows clearing
                        return;
                    }
                    let val = parseFloat(inputValue);
                    if (isNaN(val)) return;

                    // Only clamp max, let min be handled by validation or allow typing
                    if (val > max) val = max;

                    onChange(val);
                }}
            />
        </div>
    );
}
