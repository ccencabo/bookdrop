import type { Book } from './types';

const dropDateKey = new Intl.DateTimeFormat('en-US', {
  timeZone:'Asia/Manila',
  year:'numeric',
  month:'2-digit',
  day:'2-digit',
});

export function bookDropDateKey(book:Pick<Book,'publish_at'>) {
  return dropDateKey.format(new Date(book.publish_at));
}

export function splitLatestBookDrop(books:Book[]) {
  const latestKey=books[0]?bookDropDateKey(books[0]):null;
  if(!latestKey)return {latest:[],previous:[]};
  return {
    latest:books.filter((book)=>bookDropDateKey(book)===latestKey),
    previous:books.filter((book)=>bookDropDateKey(book)!==latestKey),
  };
}
