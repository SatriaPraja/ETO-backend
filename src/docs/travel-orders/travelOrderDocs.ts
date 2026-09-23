const commonPostDoc = {
  tags: ["Travel Orders"],
  summary: "Buat Travel Order Baru",
  description:
    "Endpoint untuk mengajukan Travel Order baru. Identitas Booker ID diambil langsung secara otomatis dari klaim Token JWT yang terautentikasi.",
  security: [{ BearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/CreateTravelOrderRequest",
        },
      },
    },
  },
  responses: {
    201: {
      description: "Travel Order berhasil diajukan",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: {
                type: "string",
                example: "Travel Order berhasil diajukan.",
              },
              data: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "c392c19e-9e7c-4d37-a169-28ec96fa1548",
                  },
                  toCode: { type: "string", example: "TO/2026/05/00214" },
                  status: { type: "string", example: "WAITING_PEJABAT" },
                  totalEstimatedCost: { type: "number", example: 8450000 },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    example: "2026-05-14T08:30:00.000Z",
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description:
        "Bad Request / Saldo Anggaran Tidak Cukup / Validasi Form Gagal",
    },
    401: {
      description: "Unauthorized / Token JWT Tidak Dilihat atau Tidak Valid",
    },
    403: {
      description:
        "Forbidden / Role Pengguna Bukan OFFICIAL_BOOKER atau SUPER_ADMIN",
    },
  },
};

export const travelOrderDocs = {
  "/api/travel-orders": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Baru (Generik Semua Moda)",
    },
  },
  "/api/travel-orders/flight": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Pesawat Baru",
    },
  },
  "/api/travel-orders/train": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Kereta Api Baru",
    },
  },
  "/api/travel-orders/sea": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Kapal Laut Baru",
    },
  },
  "/api/travel-orders/bus": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Bus / Travel Baru",
    },
  },
  "/api/travel-orders/car": {
    post: {
      ...commonPostDoc,
      summary: "Buat Travel Order Mobil Dinas Baru",
    },
  },
};
