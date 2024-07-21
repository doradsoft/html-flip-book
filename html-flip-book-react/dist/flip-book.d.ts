import { default as React } from 'react';
import { PageSemantics } from 'html-flip-book-base';

interface FlipBookWrapperProps {
    pages: React.ReactNode[];
    className: string;
    pageSemantics?: PageSemantics;
    debug?: boolean;
    direction?: 'rtl' | 'ltr';
}
declare const FlipBookReact: React.FC<FlipBookWrapperProps>;
export { FlipBookReact as FlipBook };
export type { PageSemantics };
//# sourceMappingURL=FlipBook.d.ts.map
