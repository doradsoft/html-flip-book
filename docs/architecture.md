# Architecture

## Principles

1. **Everything that can get into base should get into base.**
   Core logic, commands, store, and book behavior live in the framework-agnostic base package. Only UI bindings and framework-specific wiring stay in React (or other wrappers).

2. **React is just a wrapper.**
   The React package composes the base: FlipBook component wraps the vanilla flipbook, Toolbar wraps toolbar items and command provider. It does not duplicate business logic.

3. **Book constructor populates the store layer.**
   When a book is created (the base FlipBook constructor, or the React FlipBook that creates it), book-level options (e.g. `tocPageIndex`) are written into the **store layer** in base. The React layer does not import or call store setters; it only passes options into the book. The store is the single source of truth for book-level state that commands and UI need.

4. **Commands use the store; UI uses the store.**
   Commands (e.g. goToToc) read from the store to execute. Toolbar items (e.g. TocButton) read from the same store for enabled/disabled state and display. No passing of this config through command `data` or multiple props.

5. **Toolbar items use the commands.**
   Each toolbar item (First, Prev, Next, Last, TOC, Fullscreen, Download, etc.) triggers the corresponding command. Items do not call the flipbook API directly; they call `executeCommand(id)` so hotkeys and buttons stay in sync.

6. **Toolbar is just a wrapper for multiple toolbar items.**
   The Toolbar component provides context (flipBook ref, direction, locale, etc.) and wraps the command provider and a container for the items. It does not implement behavior; it lays out and configures the store and commands, and renders the items the consumer places inside it.

## Layering (high level)

```
Book config (e.g. tocPageIndex) → Store (base)
                    ↓
    Commands (base) read store │ UI (React toolbar items) read store
                    ↓                          ↓
              executeCommand("goToToc")   TocButton disabled state
                    ↓
              FlipBook ref (flipNext, jumpToPage, …)
```

- **Base:** store, commands, flipbook engine, download types.
- **React:** FlipBook (wraps engine), Toolbar (wraps command provider + context), toolbar items (use commands + store).
- **Consumer:** Renders one or more books, sets book-level config (e.g. Toolbar `tocPageIndex`), which populates the store; places toolbar items inside Toolbar.
