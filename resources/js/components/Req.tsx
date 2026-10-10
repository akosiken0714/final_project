// A small red star for required fields:  <label>Name <Req /></label>
export default function Req() {
    return (
        <span
            className="ml-0.5 font-semibold text-red-600"
            title="Required"
            aria-hidden="true"
        >
            *
        </span>
    );
}

// "* required" hint, shown once at the top of a form.
export function ReqNote({ className = '' }: { className?: string }) {
    return (
        <p
            className={`text-xs tracking-normal normal-case opacity-70 ${className}`}
        >
            <span className="font-semibold text-red-600">*</span> required
        </p>
    );
}
