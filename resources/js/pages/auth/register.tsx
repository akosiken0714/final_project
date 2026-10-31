import Req, { ReqNote } from '@/components/Req';
import { Form, Head } from '@inertiajs/react';
import AvatarField from '@/components/AvatarField';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <ReqNote className="text-muted-foreground" />

                            <div className="grid gap-2">
                                <Label>Profile picture (optional)</Label>
                                <AvatarField
                                    name="avatar"
                                    serverError={errors.avatar}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    Name <Req />
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    maxLength={60}
                                    name="name"
                                    placeholder="Full name"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Email address <Req />
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

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
                                    autoComplete="tel"
                                    name="phone"
                                    placeholder="09XX XXX XXXX"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">
                                    Address (optional)
                                </Label>
                                <Input
                                    id="address"
                                    type="text"
                                    autoComplete="street-address"
                                    name="address"
                                    placeholder="House no., street, barangay, city"
                                />
                                <InputError message={errors.address} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Password <Req />
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                />
                                <InputError message={errors.password} />
                                <p className="text-muted-foreground text-xs">
                                    At least 8 characters with a big letter
                                    (A-Z), a small letter (a-z) and a number.
                                    Don&apos;t reuse a password from another
                                    site. You can pin your usual pickup spot on
                                    the map later in Settings.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password <Req />
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="terms"
                                        name="terms"
                                        required
                                        tabIndex={5}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="terms"
                                        className="text-sm leading-snug font-normal"
                                    >
                                        I have read and agree to the{' '}
                                        <a
                                            href="/terms"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline"
                                        >
                                            Terms of Service
                                        </a>{' '}
                                        and the{' '}
                                        <a
                                            href="/privacy"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline"
                                        >
                                            Privacy Policy
                                        </a>
                                        . <Req />
                                    </Label>
                                </div>
                                <InputError message={errors.terms} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={6}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-muted-foreground text-center text-sm">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={7}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your account',
    description: 'Create an account to start ordering.',
};
