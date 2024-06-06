import { fileURLToPath } from "url";
import path from "path";
import webpack from "webpack";

// Convert the URL of the current module to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
  mode: "development",
  entry: "./src/FlipBook.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "flipbook.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "module",
    module: true,
  },
  experiments: {
    outputModule: true,
  },
};

export default config;
