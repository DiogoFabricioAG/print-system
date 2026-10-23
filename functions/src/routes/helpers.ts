export const errorResponse = (message: string, details?: unknown) => ({
    success: false,
    error: message,
    details,
});

export const getIdParam = (rawId: string) => {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
};
