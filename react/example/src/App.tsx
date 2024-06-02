// App.tsx
import type { FC } from "react";
import "./App.css"; // Import the CSS file
import EnBook from "./EnBook";
import HeBook from "./HeBook";

export const App: FC = () => {
  return (
    <div className="app">
      <header>
        <h1>HTML Flip Book Example</h1>
      </header>
      <section className="books-container">
        <section className="en-book-container">
          <EnBook />
        </section>
        <section className="he-book-container">
          <HeBook />
        </section>
      </section>
    </div>
  );
};

export default App;
