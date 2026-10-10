import Req, { ReqNote } from '@/components/Req';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AvatarField from '@/components/AvatarField';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import LocationPicker from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { quote, type Zone } from '@/lib/delivery';
import { reverseGeocode, round6 } from '@/lib/geo';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    errors: Record<string, string>;
};

export default function Profile({
    mustVerifyEmail,
    status,
    zone,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    zone: Zone;
}) {
    const { auth, errors: pageErrors } = usePage<PageProps>().props;
    const user = auth.user;

    const [email, setEmail] = useState(user.email);
    const emailChanged =
        email.trim().toLowerCase() !== user.email.toLowerCase();

    // The usual pickup/delivery spot. Saved with the rest of the form through two hidden fields.
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
        user.default_lat != null && user.default_lng != null
            ? { lat: Number(user.default_lat), lng: Number(user.default_lng) }
            : null,
    );
    const [address, setAddress] = useState(user.address ?? '');
    const [finding, setFinding] = useState(false);
    const [locError, setLocError] = useState('');
    const spot = pin ? quote(zone, pin.lat, pin.lng) : null;

    const movePin = async (p: { lat: number; lng: number }) => {
        setPin(p);
        if (address.trim() === '') {
            const found = await reverseGeocode(p.lat, p.lng);
            if (found) setAddress((now) => (now.trim() === '' ? found : now));
        }
    };

    const useMyLocation = () => {
        setLocError('');
        if (!navigator.geolocation) {
            setLocError(
                'Your browser cannot share its location. Tap the map instead.',
            );
            return;
        }
        setFinding(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFinding(false);
                movePin({
                    lat: round6(pos.coords.latitude),
                    lng: round6(pos.coords.longitude),
                });
            },
            () => {
                setFinding(false);
                setLocError(
                    "We couldn't get your location. Tap the map instead.",
                );
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Your picture, contact details and usual pickup spot"
                />

                <AvatarField
                    name="avatar"
                    current={user.avatar}
                    instant
                    serverError={pageErrors?.avatar}
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <ReqNote className="text-muted-foreground" />

                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    Name <Req />
                                </Label>
                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Email address <Req />
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {emailChanged && (
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        Current password <Req />
                                    </Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        className="mt-1 block w-full"
                                        name="current_password"
                                        autoComplete="current-password"
                                        placeholder="Needed to change your email"
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={errors.current_password}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        After changing your email you&apos;ll
                                        need to verify the new one.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="phone">
                                    Contact number <Req />
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode="tel"
                                    required
                                    maxLength={16}
                                    pattern="(09|\+639)[0-9 \-]{9,12}"
                                    title="09XX XXX XXXX or +63 9XX XXX XXXX"
                                    onInput={(e) => {
                                        e.currentTarget.value =
                                            e.currentTarget.value.replace(
                                                /[^\d+\s-]/g,
                                                '',
                                            );
                                    }}
                                    className="mt-1 block w-full"
                                    defaultValue={user.phone ?? ''}
                                    name="phone"
                                    autoComplete="tel"
                                    placeholder="09XX XXX XXXX"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.phone}
                                />
                            </div>

                            {/* Customers only: admins don't place orders, so no pickup spot */}
                            {user.role !== 'admin' && (
                                <div className="rounded-xl border p-4">
                                    <p className="text-sm font-semibold">
                                        Usual pickup &amp; delivery spot
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Save it once and your order page fills
                                        it in for you. Change it any time.
                                    </p>

                                    <div className="mt-4 grid gap-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            className="mt-1 block w-full"
                                            value={address}
                                            onChange={(e) =>
                                                setAddress(e.target.value)
                                            }
                                            name="address"
                                            autoComplete="street-address"
                                            placeholder="House no., street, barangay, city"
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={errors.address}
                                        />
                                    </div>

                                    <div className="mt-4 grid gap-2">
                                        <Label htmlFor="delivery_notes">
                                            Notes for the rider (optional)
                                        </Label>
                                        <Input
                                            id="delivery_notes"
                                            className="mt-1 block w-full"
                                            defaultValue={
                                                user.delivery_notes ?? ''
                                            }
                                            name="delivery_notes"
                                            maxLength={200}
                                            placeholder="Blue gate, call when you arrive"
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={errors.delivery_notes}
                                        />
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label>Pin on the map</Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={useMyLocation}
                                                    disabled={finding}
                                                >
                                                    {finding
                                                        ? 'Locating…'
                                                        : 'Use my location'}
                                                </Button>
                                                {pin && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setPin(null)
                                                        }
                                                    >
                                                        Clear pin
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <LocationPicker
                                                value={pin}
                                                shop={zone.shop}
                                                maxKm={zone.max_km}
                                                onChange={movePin}
                                                onAddress={(text) =>
                                                    setAddress((now) =>
                                                        now.trim() === ''
                                                            ? text
                                                            : now,
                                                    )
                                                }
                                            />
                                        </div>
                                        {locError && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {locError}
                                            </p>
                                        )}
                                        {pin && spot?.deliverable && (
                                            <p className="mt-2 text-sm text-green-700">
                                                {spot.km.toFixed(1)} km from the
                                                shop, so delivery is available.
                                            </p>
                                        )}
                                        {pin && spot && !spot.deliverable && (
                                            <p className="mt-2 text-sm text-red-600">
                                                This spot is{' '}
                                                {spot.km.toFixed(1)} km away.
                                                That&apos;s outside our delivery
                                                area, but you can still drop off
                                                at the shop.
                                            </p>
                                        )}
                                        <InputError
                                            className="mt-2"
                                            message={
                                                errors.default_lat ||
                                                errors.default_lng
                                            }
                                        />
                                        <input
                                            type="hidden"
                                            name="default_lat"
                                            value={pin?.lat ?? ''}
                                        />
                                        <input
                                            type="hidden"
                                            name="default_lng"
                                            value={pin?.lng ?? ''}
                                        />
                                    </div>
                                </div>
                            )}

                            {mustVerifyEmail &&
                                user.email_verified_at === null && (
                                    <div>
                                        <p className="text-muted-foreground -mt-4 text-sm">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to re-send the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
