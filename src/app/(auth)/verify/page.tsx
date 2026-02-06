'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VerifyEmailScreen } from '@/src/containers/screens';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    if (!email) {
        router.replace('/signup');
        return null;
    }

    return (
        <VerifyEmailScreen
            email={email}
            onVerifySuccess={() => router.push('/verify-success')}
            onBackToSignup={() => router.push('/signup')}
            onResendCode={() => {}}
        />
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black" />
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
