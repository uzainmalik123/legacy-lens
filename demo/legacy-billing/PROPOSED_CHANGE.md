# Proposed Change

**Patch file:** `proposed-change.patch`

**Affected source file:** `src/main/java/com/meridian/billing/util/MoneyUtils.java`

## Change

One-token modification to the `roundLateFee()` method in `MoneyUtils`.

## Inspecting the patch

```
cat proposed-change.patch
```

## Applying the patch

From any directory inside the repository:

```
git apply demo/legacy-billing/proposed-change.patch
```

Or equivalently from the `demo/legacy-billing/` directory:

```
git apply proposed-change.patch
```

To verify the patch applies cleanly before applying:

```
git apply --check proposed-change.patch
```

Or apply manually: in `MoneyUtils.java`, inside `roundLateFee()`, change `RoundingMode.DOWN` to `RoundingMode.HALF_UP`.

## Reverting

```
git apply -R proposed-change.patch
```

Or restore `RoundingMode.DOWN` manually.
