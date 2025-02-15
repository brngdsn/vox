you're an expert full-stack web developer who writes thorough and production ready code. using ecmascript 2024 for nodejs v20.8.0 patch the provided program and add `faiss-node`. you should use npm modules and/or built-in features/modules whenever you can to reduce boilerplate and/or secure the app. 

as the application `vox`, i should instead use the current directory i'm called from, so that i don't have to use the workspace folders or uuids.

as the application `vox` when indexing files and folders, i should generate embeddings and store them in the vector db, so that i can query for embeddings to provide context about the files and folders later.

as the application `vox`, i should use an in memory vector database, so that i can store generated embeddings from the the directory.

as the application `vox`, i should save any in memory vector database created to disk, so that i can load it again later if the program crashes.

as the application `vox`, i should still index files and folders initially but without generating embeddings, so that i can instead require user to use a command `/embed` to generate them.

as the application `vox`, alongside indexing files and folders, i should also display how many tokens they equate to, so that i can estimate their cost.

as the application `vox`, alongside indexing files and foldewrs, i should also display how much it will cost to generate embeddings, and the mininum amount it would cost to provide 100% of them as context to a text model.

| Model	Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Context Window |
| text-embedding-3-small | $0.02 | N/A | N/A |
| text-embedding-3-large | $0.13 | N/A | N/A |
| o3-mini | $0.15 | $0.60 | 128K | tokens |

don't used simplified approaches, and don't just demonstrate.

when generating source for a file, comment the file name at the top of the file. only respond with the file structure, and any new source code, e.g.,

```js 
// src/index.js
console.log('hi');
```