"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCurrentUserDeveloper } from "@/action/tickets";

/**
 * Press "S" anywhere to jump to the support triage view.
 *
 * Mounted globally in the root layout, but only active for developers on the
 * DEVELOPER_EMAILS allowlist, matching the gate on /admin/support itself.
 *
 * Access is resolved through a server action rather than by importing the auth
 * guards here: those pull in `supabaseAdmin`, and a client component cannot
 * touch the service-role key. A client component also cannot await a server
 * guard during render — hence the effect below.
 *
 * A bare letter key is only safe if it yields where a keystroke means something
 * else, so this also bails out when the user is typing, when a modifier is held,
 * and when any overlay is open — navigating away from an open shift dialog would
 * discard the user's work.
 */

const KEY = "s";
const TARGET = "/admin/support";

// Radix renders dialogs, selects and dropdown menus with these roles. If any is
// mounted, the keystroke belongs to that overlay (typeahead, focus trap), not us.
const OVERLAY_SELECTOR = '[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]';

function isTypingIn(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	if (!el || typeof el.tagName !== "string") return false;
	if (el.isContentEditable) return true;
	return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

export default function SupportShortcut() {
	const router = useRouter();
	const pathname = usePathname();
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		isCurrentUserDeveloper()
			.then(setEnabled)
			.catch(() => setEnabled(false));
	}, []);

	useEffect(() => {
		if (!enabled) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== KEY) return;
			// Leave browser and OS combos alone (⌘S, Ctrl+S, Alt+S).
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.defaultPrevented) return;
			if (isTypingIn(event.target)) return;
			if (document.querySelector(OVERLAY_SELECTOR)) return;
			if (pathname === TARGET) return;

			event.preventDefault();
			router.push(TARGET);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, router, pathname]);

	return null;
}
