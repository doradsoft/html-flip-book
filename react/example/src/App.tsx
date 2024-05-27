import type { FC } from "react";
import FlipBook from "../../src/FlipBook";
import "./App.css"; // Import the CSS file
import { PageSemantics } from "flip-book";

export const App: FC = () => {
  const pages = Array.from({ length: 10 }, (_, index) => (
    <div key={index}>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>
  ));
  const hePageSemanticsDict: Record<number, string> = {
    4: "א",
    5: "ב",
    6: "ג",
  };

  const hePageSemantics: PageSemantics = {
    indexToSemanticName(pageIndex: number): string {
      return hePageSemanticsDict[pageIndex] ?? "";
    },
    semanticNameToIndex(semanticPageName: string): number | null {
      const entry = Object.entries(hePageSemanticsDict).find(
        ([, value]) => value === semanticPageName
      );
      return entry ? parseInt(entry[0]) : null;
    },
    indexToTitle(pageIndex: number): string {
      const chapter = hePageSemanticsDict[pageIndex];
      return chapter ? `פרק ${chapter}` : "";
    },
  };

  return (
    <div className="app">
      <header>
        <h1>HTML Flip Book Example</h1>
        {/* other components */}
      </header>
      <section className="books-container">
        <section className="en-book-container">
          <FlipBook className="en-book" pages={pages} debug={true} />
        </section>
        <section className="he-book-container">
          <FlipBook
            className="he-book"
            pages={pages}
            pageSemantics={hePageSemantics}
            debug={true}
            direction="rtl"
          />
        </section>
      </section>
    </div>
  );
};

export default App;
