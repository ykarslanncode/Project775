import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      setSent(true);
      toast.success('Password reset email sent.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-foreground font-display text-base font-bold text-background">
            775
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Reset Password</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {sent ? 'Check your email for a reset link.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-10 w-full">
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <Button className="h-10 w-full" onClick={() => window.location.reload()}>
            Resend
          </Button>
        )}

        <div className="mt-6 text-center text-[13px]">
          <Link to="/signin" className="text-muted-foreground hover:text-foreground">
            Back to <span className="text-foreground hover:underline">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
