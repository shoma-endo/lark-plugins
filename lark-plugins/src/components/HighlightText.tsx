import React, { useMemo } from 'react';
import { Typography } from '@douyinfe/semi-ui';
import { escapeRegExp } from '../utils/search';

const { Text } = Typography;

interface HighlightTextProps {
  text: string;
  highlight: string;
  highlightStyle?: React.CSSProperties;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlight,
  highlightStyle = { backgroundColor: 'yellow', padding: '0 2px' },
}) => {
  const parts = useMemo(() => {
    if (!highlight.trim() || !text) {
      return [{ text, highlight: false }];
    }

    try {
      // デバッグ情報
      console.log(`ハイライト処理: テキスト="${text}", 検索語="${highlight}"`);
      
      // 検索語をエスケープして正規表現を作成
      const escapedHighlight = escapeRegExp(highlight.trim());
      console.log(`エスケープ後の検索語: "${escapedHighlight}"`);
      
      // 大文字小文字を区別しない正規表現を作成
      const regex = new RegExp(`(${escapedHighlight})`, 'gi');
      
      // テキストを分割
      const splitParts = text.split(regex);
      console.log(`分割結果: ${JSON.stringify(splitParts)}`);
      
      // 各部分がハイライトすべきかどうかを判定
      const result = splitParts.map((part, i) => {
        // 大文字小文字を区別せずに比較
        // 正規表現のマッチングを使用せず、単純な文字列比較を行う（日本語に適している）
        const isHighlight = part.toLowerCase() === highlight.toLowerCase().trim();
        console.log(`部分 ${i}: "${part}" - ハイライト: ${isHighlight}`);
        return {
          text: part,
          highlight: isHighlight,
        };
      });

      // 正規表現をリセット
      regex.lastIndex = 0;
      
      return result;
    } catch (error) {
      console.error('ハイライト処理でエラーが発生しました:', error);
      
      // エラーが発生した場合は、単純な文字列比較を使用してハイライト
      try {
        const lowerText = text.toLowerCase();
        const lowerHighlight = highlight.toLowerCase().trim();
        
        if (!lowerHighlight || !lowerText.includes(lowerHighlight)) {
          return [{ text, highlight: false }];
        }
        
        const result: { text: string; highlight: boolean }[] = [];
        let lastIndex = 0;
        let index = lowerText.indexOf(lowerHighlight);
        
        while (index !== -1) {
          // ハイライト前のテキスト
          if (index > lastIndex) {
            result.push({
              text: text.substring(lastIndex, index),
              highlight: false,
            });
          }
          
          // ハイライト部分
          result.push({
            text: text.substring(index, index + lowerHighlight.length),
            highlight: true,
          });
          
          lastIndex = index + lowerHighlight.length;
          index = lowerText.indexOf(lowerHighlight, lastIndex);
        }
        
        // 残りのテキスト
        if (lastIndex < text.length) {
          result.push({
            text: text.substring(lastIndex),
            highlight: false,
          });
        }
        
        return result;
      } catch (e) {
        console.error('フォールバックハイライト処理でもエラーが発生しました:', e);
        return [{ text, highlight: false }];
      }
    }
  }, [text, highlight]);

  return (
    <>
      {parts.map((part, i) => (
        part.highlight ? (
          <Text key={i} style={highlightStyle}>{part.text}</Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        )
      ))}
    </>
  );
};
