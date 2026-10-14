export const records:{leads:any[][];events:any[][];recent:number;db:any}={leads:[],events:[],recent:0,db:null};
records.db={prepare(sql:string){let args:any[]=[];return {bind(...values:any[]){args=values;return this;},async first(){return {n:records.recent};},async all(){return {results:[]};},async run(){if(sql.startsWith('INSERT INTO leads'))records.leads.push(args);if(sql.startsWith('INSERT INTO events'))records.events.push(args);return {success:true};}};}};
export const env={DB:records.db};
