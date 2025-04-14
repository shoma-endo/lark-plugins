import React, { useState, useCallback, useEffect } from 'react';
import { Input, Button, Space } from '@douyinfe/semi-ui';
import { IconSearch, IconClose } from '@douyinfe/semi-icons';

interface SearchBarProps {
  onSearch: (searchText: string) => void;
  placeholder?: string;
  debounceTime?: number; // リアルタイム検索の遅延時間（ミリ秒）
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'テーブル内を検索...',
  debounceTime = 300 // デフォルトの遅延時間
}) => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>(searchText);

  // 検索テキストが変更されたときのハンドラ
  const handleSearchTextChange = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  // 検索テキストの変更を遅延させる（デバウンス処理）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, debounceTime);

    return () => {
      clearTimeout(timer);
    };
  }, [searchText, debounceTime]);

  // デバウンスされた検索テキストが変更されたときに検索を実行
  useEffect(() => {
    onSearch(debouncedSearchText);
  }, [debouncedSearchText, onSearch]);

  const handleClear = useCallback(() => {
    setSearchText('');
    // クリア時は即時検索を実行（遅延なし）
    onSearch('');
  }, [onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(searchText);
    }
  }, [searchText, onSearch]);

  return (
    <Space style={{ width: '100%', marginBottom: 16 }}>
      <Input
        style={{ width: '100%' }}
        value={searchText}
        onChange={handleSearchTextChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        prefix={<IconSearch />}
        suffix={
          searchText ? (
            <IconClose 
              style={{ cursor: 'pointer' }} 
              onClick={handleClear} 
            />
          ) : null
        }
      />
    </Space>
  );
};
