const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = (env, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',
  
  // Для Webpack 4 используем 'inline-source-map' для dev режима
  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  entry: {
    // ВАЖНО: Точки входа должны иметь расширение .ts
    ui: './src/ui.ts', 
    code: './src/code.ts', 
  },

  module: {
    rules: [
      // Обработка TS и TSX
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },

      // Обработка CSS
      { test: /\.css$/, loader: [{ loader: 'style-loader' }, { loader: 'css-loader' }] },

      // Обработка картинок
      { test: /\.(png|jpg|gif|webp|svg)$/, loader: [{ loader: 'url-loader' }] },
    ],
  },

  resolve: { 
    // Добавляем .ts и .tsx в список расширений
    extensions: ['.tsx', '.ts', '.jsx', '.js'] 
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },

  // Это нужно для некоторых библиотек в Webpack 4
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui.html',
      filename: 'ui.html',
      inlineSource: '.(js)$',
      chunks: ['ui'],
    }),
    new HtmlWebpackInlineSourcePlugin(),
  ],
})