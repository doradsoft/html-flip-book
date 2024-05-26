import React, { useEffect, useRef } from "react";
import { FlipBook as FlipBookBase, PageSemantics } from "flip-book";

interface FlipBookWrapperProps {
  pages: React.ReactNode[];
  className: string;
  pageSemantics?: PageSemantics;
  // Add any other props that the wrapper might need
}

const FlipBookReact: React.FC<FlipBookWrapperProps> = ({
  pages,
  pageSemantics,
  className,
}) => {
  const flipBook = useRef(
    new FlipBookBase({ pageSemantics: pageSemantics, totalPages: pages.length })
  );

  useEffect(() => {
    flipBook.current.initialize(`.${className}`);
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
