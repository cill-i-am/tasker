import type { Collection } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useRef } from 'react';
import { type Message, messagesCollection } from '@/db-collections';

function useStreamConnection(
  url: string,
  collection: Collection<number, Message, Message>
): void {
  const loadedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (loadedRef.current) {
        return;
      }
      loadedRef.current = true;

      const response = await fetch(url);
      const reader = response.body?.getReader();
      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      await readStreamLines(reader, decoder, (line) => {
        collection.insert(JSON.parse(line) as Message);
      });
    };
    fetchData();
  }, [collection.insert, url]);
}

async function readStreamLines(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onLine: (line: string) => void
) {
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const lines = decoder
      .decode(value, { stream: true })
      .split('\n')
      .filter((line) => line.length > 0);
    for (const line of lines) {
      onLine(line);
    }
  }
}

export function useChat() {
  useStreamConnection('/demo/db-chat-api', messagesCollection);

  const sendMessage = (message: string, user: string) => {
    fetch('/demo/db-chat-api', {
      method: 'POST',
      body: JSON.stringify({ text: message.trim(), user: user.trim() }),
    });
  };

  return { sendMessage };
}

export function useMessages() {
  const { data: messages } = useLiveQuery((q) =>
    q.from({ message: messagesCollection }).select(({ message }) => ({
      ...message,
    }))
  );

  return messages as Message[];
}
