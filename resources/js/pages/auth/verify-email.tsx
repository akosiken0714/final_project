// Components
import { Form, Head, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    // The email we sent the link to (shown so a typo is easy to spot). Skipped quietly if it is not available.
    const page = usePage();
    const current = (
        page.props as unknown as { auth?: { user?: { email?: string } } }
    ).auth?.user?.email;

    return (
        <>
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            {status === 'email-changed' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Okay! We sent a new verification link to your corrected
                    email.
                </div>
            )}

            {current && (
                <p className="mb-4 text-center text-sm">
                    We sent the link to{' '}
                    <span className="font-semibold break-all">{current}</span>
                </p>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Resend verification email
                        </Button>
                    </>
                )}
            </Form>

            <Form
                action="/email/change"
                method="post"
                className="mt-6 text-left"
            >
                {({ processing, errors }) => (
                    <details open={Boolean(errors.email)}>
                        <summary className="cursor-pointer text-center text-sm underline underline-offset-4">
                            Wrong email? Change it
                        </summary>

                        <div className="mt-3 grid gap-2">
                            <Label htmlFor="new-email">
                                Correct email address
                            </Label>
                            <Input
                                id="new-email"
                                type="email"
                                name="email"
                                required
                                autoComplete="email"
                                placeholder="email@example.com"
                            />
                            <InputError message={errors.email} />
                            <Button disabled={processing} variant="secondary">
                                {processing && <Spinner />}
                                Change email and resend link
                            </Button>
                        </div>
                    </details>
                )}
            </Form>

            <TextLink
                href={logout()}
                className="mx-auto mt-6 block text-center text-sm"
            >
                Log out
            </TextLink>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
