'use client';

interface Step {
    number: number;
    label: string;
    status: 'active' | 'completed' | 'inactive';
}

interface StepIndicatorProps {
    steps: Step[];
}

export default function StepIndicator({ steps }: StepIndicatorProps) {
    return (
        <div className="step-indicator">
            {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                    <div className="step">
                        <div className={`step-number ${step.status}`}>
                            {step.status === 'completed' ? '✓' : step.number}
                        </div>
                        <span className={`ml-2 text-sm font-medium ${step.status === 'active' ? 'text-blue-600' :
                                step.status === 'completed' ? 'text-green-600' :
                                    'text-gray-400'
                            }`}>
                            {step.label}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`step-line ${step.status === 'completed' ? 'completed' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

