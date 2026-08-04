// @ts-check
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

/** @type {(env: Record<string, unknown>, argv: { mode?: import("webpack").Configuration["mode"] }) => import("webpack").Configuration} */
module.exports = (env, argv) => {
  const mode = argv.mode ?? "development";
  const isProd = mode === "production";

  return {
    entry: "./src/index.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.[contenthash].js",
      clean: true,
      publicPath: "",
    },
    mode,
    devtool: isProd ? false : "source-map",
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: ["@tailwindcss/postcss", "autoprefixer"],
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(mode),
      }),
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        favicon: false,
      }),
      // The dev server serves public/ via devServer.static, but a production
      // build must copy it explicitly — index.html loads smt-base-bridge.min.js
      // from the site root, so without this every deployed viewer loads with no
      // bridge at all. index.html itself is excluded because HtmlWebpackPlugin
      // emits it from the same source.
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "public",
            to: ".",
            globOptions: { ignore: ["**/index.html"] },
          },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      historyApiFallback: true,
      port: 3000,
      hot: true,
      open: true,
      server: {
        type: "https",
      },
    },
  };
};
