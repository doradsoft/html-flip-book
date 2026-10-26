import { hotkeyReleased } from "./hotkey-utils";
import type {
	CommandContext,
	CommandRegistry,
	HotkeyBinding,
	ToggleCommandDefinition,
} from "./types";

function sameBinding(a: HotkeyBinding, b: HotkeyBinding): boolean {
	const modifiers = ["ctrl", "shift", "alt", "meta"] as const;
	const sameModifiers = modifiers.every(
		(modifier) => !!a.modifiers?.[modifier] === !!b.modifiers?.[modifier],
	);
	return (
		a.key === b.key &&
		a.mode === b.mode &&
		(a.active ?? true) === (b.active ?? true) &&
		sameModifiers
	);
}

interface HeldToggle {
	command: ToggleCommandDefinition;
	context: CommandContext;
	initial: boolean;
	bindings: HotkeyBinding[];
}

/** Tracks temporary toggle overrides independently of UI renders and keyboard repeat. */
export class HoldHotkeyController {
	private held = new Map<string, HeldToggle>();

	has(commandId: string): boolean {
		return this.held.has(commandId);
	}

	press(
		command: ToggleCommandDefinition,
		binding: HotkeyBinding,
		context: CommandContext,
	): boolean {
		const current = this.held.get(command.id);
		if (current?.bindings.some((b) => sameBinding(b, binding))) return false;
		const held = current ?? {
			command,
			context: { ...context, transient: true },
			initial: command.isActive(context),
			bindings: [],
		};
		if (command.setActive(held.context, binding.active ?? true) === false) return false;
		held.bindings.push(binding);
		this.held.set(command.id, held);
		return true;
	}

	release(event: KeyboardEvent, direction: "ltr" | "rtl"): boolean {
		return this.removeBindings((binding) => hotkeyReleased(binding, event, direction));
	}

	/** Restore removed/disabled bindings without interrupting holds on ordinary rerenders. */
	reconcile(registry: CommandRegistry, disabled: boolean): boolean {
		if (disabled) return this.clear();
		return this.removeBindings((binding, held) => !this.isRegistered(binding, held, registry));
	}

	private isRegistered(
		binding: HotkeyBinding,
		held: HeldToggle,
		registry: CommandRegistry,
	): boolean {
		const entry = registry[held.command.id];
		if (!entry || entry.options.disableHotkeys || entry.command !== held.command) return false;
		const bindings = entry.options.hotkeys ?? entry.command.hotkeys ?? [];
		return bindings.some((b) => sameBinding(b, binding));
	}

	clear(): boolean {
		return this.removeBindings(() => true);
	}

	private removeBindings(
		shouldRemove: (binding: HotkeyBinding, held: HeldToggle) => boolean,
	): boolean {
		let changed = false;
		for (const [id, held] of this.held) {
			const remaining = held.bindings.filter((binding) => !shouldRemove(binding, held));
			if (remaining.length === held.bindings.length) continue;
			changed = true;
			held.bindings = remaining;
			const active = remaining.length
				? (remaining[remaining.length - 1].active ?? true)
				: held.initial;
			held.command.setActive(held.context, active);
			if (!remaining.length) this.held.delete(id);
		}
		return changed;
	}
}
