# FamilyRoots architecture

```text
React/Vite
  |
  | HTTP + httpOnly JWT cookie
  v
Express API
  |-- Auth middleware -> User -> owned FamilyTree
  |-- Member routes  -> FamilyMember
  |-- Relationship routes -> Relationship graph edges
  `-- Upload route -> Cloudinary
                 \
                  -> MongoDB stores URLs/public IDs, not image binaries
```

Ownership is enforced by querying records with `tree: req.tree._id`, where `req.tree` is resolved from the authenticated user. A caller cannot select another user's tree by simply changing a request parameter.

The graph has no generation-depth field. New relationships are edges between member IDs, allowing arbitrary generations and relationship types.
