declare module 'react-katex' {
  import { FC, ReactNode } from 'react';

  interface KaTeXProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => ReactNode;
    settings?: {
      displayMode?: boolean;
      throwOnError?: boolean;
      errorColor?: string;
      macros?: { [key: string]: string };
      colorIsTextColor?: boolean;
      strict?: boolean | 'error' | 'warn' | 'ignore' | ((errorCode: string) => 'error' | 'warn' | 'ignore');
      maxSize?: number;
      maxExpand?: number;
      fleqn?: boolean;
    };
  }

  export const InlineMath: FC<KaTeXProps>;
  export const BlockMath: FC<KaTeXProps>;
}