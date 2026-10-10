// A round profile picture, or the person's initials when they haven't set one.
export default function UserAvatar({
    user,
    size = 36,
}: {
    user: { name?: string; avatar?: string | null };
    size?: number;
}) {
    const initials = (user?.name ?? '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

    const box = { width: size, height: size, fontSize: Math.round(size * 0.4) };

    if (user?.avatar) {
        return (
            <img
                src={user.avatar}
                alt={user.name ?? 'Profile picture'}
                style={box}
                className="shrink-0 rounded-full object-cover ring-1 ring-[#F7F1E8]/25"
            />
        );
    }

    return (
        <span
            style={box}
            className="flex shrink-0 items-center justify-center rounded-full bg-[#F0A98B]/20 font-semibold text-[#F0A98B] ring-1 ring-[#F0A98B]/30"
            aria-hidden="true"
        >
            {initials}
        </span>
    );
}
