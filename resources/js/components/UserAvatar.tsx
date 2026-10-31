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
                className="shrink-0 rounded-full object-cover ring-1 ring-pw-cream/25"
            />
        );
    }

    return (
        <span
            style={box}
            className="flex shrink-0 items-center justify-center rounded-full bg-pw-peach/20 font-semibold text-pw-peach ring-1 ring-pw-peach/30"
            aria-hidden="true"
        >
            {initials}
        </span>
    );
}
