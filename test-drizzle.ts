import {sqliteTable, text} from 'drizzle-orm/sqlite-core';
const test = sqliteTable('test', {id: text('id')});
