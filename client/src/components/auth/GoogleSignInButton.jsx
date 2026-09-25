import { useEffect, useRef, useState } from "react";

import { getGoogleAuthConfig } from "../../services/authService";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleScriptPromise = null;
let initializedClientId = null;
let initializedNonce = null;
let activeCredentialHandler = null;

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Google Identity Services")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Could not load Google Identity Services"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const loadGoogleConfig = async () => {
  const response = await getGoogleAuthConfig();
  return response.data;
};

const GoogleSignInButton = ({
  onCredential,
  disabled = false,
  text = "continue_with",
}) => {
  const buttonRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const [error, setError] = useState("");

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let authNonce = "";

    const dispatchCredential = (credential) => {
      credentialHandlerRef.current?.(credential, authNonce);
    };

    activeCredentialHandler = dispatchCredential;

    const initialize = async () => {
      try {
        setError("");
        const [{ clientId, nonce }] = await Promise.all([
          loadGoogleConfig(),
          loadGoogleIdentityScript(),
        ]);

        if (cancelled || !buttonRef.current) {
          return;
        }

        if (!window.google?.accounts?.id || !clientId || !nonce) {
          throw new Error("Google authentication is unavailable");
        }

        authNonce = nonce;

        if (
          initializedClientId !== clientId ||
          initializedNonce !== nonce
        ) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            nonce,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: (response) => {
              if (response?.credential) {
                activeCredentialHandler?.(response.credential);
              }
            },
          });

          initializedClientId = clientId;
          initializedNonce = nonce;
        }

        const availableWidth =
          buttonRef.current.parentElement?.getBoundingClientRect().width || 320;
        const buttonWidth = Math.max(200, Math.min(360, Math.floor(availableWidth)));

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "left",
          width: buttonWidth,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message || "Google authentication is unavailable",
          );
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;

      if (activeCredentialHandler === dispatchCredential) {
        activeCredentialHandler = null;
      }
    };
  }, [text]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  return (
    <div
      className={`flex min-h-11 w-full justify-center transition ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
      aria-busy={disabled}
    >
      <div ref={buttonRef} />
    </div>
  );
};

export default GoogleSignInButton;
