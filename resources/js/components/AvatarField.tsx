import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AvatarCropper from '@/components/AvatarCropper';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 15; // the picture you choose; the cropped result is small

// Profile picture chooser.
//   instant = true  -> uploads as soon as a picture is chosen (Settings page)
//   instant = false -> just previews it; the picture is sent with the form it sits in (Register page)
export default function AvatarField({
    current,
    name,
    instant = false,
    serverError,
}: {
    current?: string | null;
    name: string;
    instant?: boolean;
    serverError?: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null); // the picture waiting to be cropped

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );
    useEffect(
        () => () => {
            if (cropSrc) URL.revokeObjectURL(cropSrc);
        },
        [cropSrc],
    );

    const clearInput = () => {
        if (fileRef.current) fileRef.current.value = '';
    };

    const choose = (file?: File | null) => {
        setError('');
        if (!file) return;

        if (!ALLOWED.includes(file.type)) {
            setError('Please choose a JPG, PNG or WebP picture.');
            clearInput();
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`Please keep the picture under ${MAX_MB} MB.`);
            clearInput();
            return;
        }

        // Open the crop window first. The picture is only used after "Use this picture".
        setCropSrc(URL.createObjectURL(file));
    };

    const cancelCrop = () => {
        setCropSrc(null);
        clearInput();
    };

    // The cropped square comes back as a file.
    const cropped = (file: File) => {
        setCropSrc(null);

        if (instant) {
            setBusy(true);
            router.post(
                '/settings/profile/avatar',
                { avatar: file },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onFinish: () => {
                        setBusy(false);
                        clearInput();
                    },
                },
            );
            return;
        }

        // On the register form: put the cropped file into the form's file box and show a preview.
        if (fileRef.current) {
            const box = new DataTransfer();
            box.items.add(file);
            fileRef.current.files = box.files;
        }
        setPreview(URL.createObjectURL(file));
    };

    const remove = () => {
        if (instant) {
            router.delete('/settings/profile/avatar', { preserveScroll: true });
        } else {
            setPreview(null);
            clearInput();
        }
    };

    const shown = preview ?? current ?? null;
    const message = error || serverError;

    return (
        <div className="flex items-center gap-4">
            {shown ? (
                <img
                    src={shown}
                    alt="Your profile picture"
                    className="h-20 w-20 rounded-full border object-cover"
                />
            ) : (
                <div className="bg-muted text-muted-foreground flex h-20 w-20 items-center justify-center rounded-full border text-xs">
                    No photo
                </div>
            )}

            <div className="grid gap-1">
                <div className="flex flex-wrap gap-2">
                    <label
                        htmlFor={`${name}-file`}
                        className="hover:bg-muted cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition"
                    >
                        {busy
                            ? 'Uploading…'
                            : shown
                              ? 'Change picture'
                              : 'Add a picture'}
                    </label>
                    {shown && (
                        <button
                            type="button"
                            onClick={remove}
                            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition"
                        >
                            Remove
                        </button>
                    )}
                </div>
                <input
                    id={`${name}-file`}
                    ref={fileRef}
                    type="file"
                    // In "instant" mode the file is sent by script, so the input must not be part of any form.
                    name={instant ? undefined : name}
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => choose(e.target.files?.[0])}
                />
                <p className="text-muted-foreground text-xs">
                    JPG, PNG or WebP. You&apos;ll be able to crop it after you
                    choose.
                </p>
                {message && <p className="text-sm text-red-600">{message}</p>}
            </div>
            {cropSrc && (
                <AvatarCropper
                    src={cropSrc}
                    onCancel={cancelCrop}
                    onDone={cropped}
                />
            )}
        </div>
    );
}
