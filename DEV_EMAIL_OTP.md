# FamilyRoots Email OTP

## Overview

FamilyRoots sends a 6-digit verification OTP to the exact email address
entered during registration.

The user must successfully enter the OTP before an authentication cookie
is created.

Both registration verification codes and collaborator invitation emails are
sent through **Brevo's HTTPS API** using:

```text
server/src/utils/email.js