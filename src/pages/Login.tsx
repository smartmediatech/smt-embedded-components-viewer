import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form } from '@base-ui/react/form';
import { Field } from '@base-ui/react/field';
import { Button } from '@base-ui/react/button';
import { useAuth } from '../context/AuthContext';
import { TenantSelect } from "../components/TenantSelect";

const inputCls =
  'w-full rounded-sm border border-black/12 dark:border-white/12 bg-transparent dark:bg-neutral-800/50 ' +
  'px-3.5 py-2.5 text-sm text-black dark:text-white outline-none transition-[border-color,box-shadow] ' +
  'data-[focused]:border-brand data-[focused]:ring-4 data-[focused]:ring-brand/15 ' +
  'data-[disabled]:opacity-50 placeholder:text-black/30 dark:placeholder:text-white/30';

export const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-5">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-black/8 dark:border-white/8 rounded-lg shadow-md p-8">
        <h1 className="font-display text-2xl font-bold text-black dark:text-white text-center">Component Demo</h1>
        <p className="text-sm text-black/50 dark:text-white/50 text-center mt-1 mb-6">Sign into your account</p>

        {/*
          The tenant must be chosen BEFORE signing in, not after: it selects the
          app id the login request is signed with, and that id has to match the
          publisher config the components load. Picking it only from the header
          (which renders after auth) would mean always authenticating against
          the default tenant and then silently mismatching.
        */}
        <div className="flex flex-col gap-1.5 mb-6">
          <span className="font-display text-sm font-medium text-black/70 dark:text-white/70">
            Environment / publisher
          </span>
          <TenantSelect />
          <span className="text-xs text-black/40 dark:text-white/40">
            Selects the fqdn and the matching app id
          </span>
        </div>

        <hr className="border-black/8 dark:border-white/8 mb-6" />

        <Form
          className="flex flex-col gap-4"
          onFormSubmit={async ({ email, password }) => {
            setError('');
            setLoading(true);
            try {
              await login({ email: (email as string).trim(), password });
              navigate('/');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field.Root name="email" className="flex flex-col gap-1.5" disabled={loading}>
            <Field.Label className="font-display text-sm font-medium text-black/70 dark:text-white/70">
              Email
            </Field.Label>
            <Field.Control
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              required
              className={inputCls}
            />
            <Field.Error match="valueMissing" className="text-xs text-red-500">
              Email is required
            </Field.Error>
            <Field.Error match="typeMismatch" className="text-xs text-red-500">
              Enter a valid email address
            </Field.Error>
          </Field.Root>

          <Field.Root name="password" className="flex flex-col gap-1.5" disabled={loading}>
            <Field.Label className="font-display text-sm font-medium text-black/70 dark:text-white/70">
              Password
            </Field.Label>
            <Field.Control
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className={inputCls}
            />
            <Field.Error match="valueMissing" className="text-xs text-red-500">
              Password is required
            </Field.Error>
          </Field.Root>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            focusableWhenDisabled
            className="mt-1 w-full rounded-sm bg-brand px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white
              transition-[background-color,opacity] hover:bg-brand-hover
              data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Form>
      </div>
    </div>
  );
};
