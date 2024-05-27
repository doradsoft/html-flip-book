import React, { useEffect, useRef } from "react";
import { FlipBook as FlipBookBase, PageSemantics } from "flip-book";

interface FlipBookWrapperProps {
  pages: React.ReactNode[];
  className: string;
  pageSemantics?: PageSemantics;
  debug?: boolean;
  direction?: "rtl" | "ltr"; // Add the direction property to the interface
  // Add any other props that the wrapper might need
}

const FlipBookReact: React.FC<FlipBookWrapperProps> = ({
  pages,
  pageSemantics,
  className,
  debug = false,
  direction = "ltr", // Add the direction prop
}) => {
  const flipBook = useRef(
    new FlipBookBase({
      pageSemantics: pageSemantics,
      totalPages: pages.length,
      direction: direction,
    })
  );

  useEffect(() => {
    flipBook.current.render(`.${className}`, debug);
    // Do any other necessary setup here
  }, []);

  return (
    <div className={className}>
      {pages.map((page, index) => (
        <div key={index} className="page">
          {page}
        </div>
      ))}
    </div>
  );
};

export default FlipBookReact;
