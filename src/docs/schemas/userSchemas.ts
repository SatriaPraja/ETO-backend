export const userSchemas = {
  RegisterRequest: {
    type: "object",
    required: [
      "npk",
      "namaLengkap",
      "email",
      "password",
      "jabatan",
      "golongan",
      "unitKerjaKode",
      "unitKerjaNama",
      "role",
    ],
    properties: {
      npk: {
        type: "string",
        example: "10000001",
        description: "Nomor Pokok Karyawan",
      },
      namaLengkap: { type: "string", example: "Super Admin E-TO" },
      email: {
        type: "string",
        example: "super.admin@bpjsketenagakerjaan.go.id",
      },
      password: { type: "string", example: "Password123!" },
      jabatan: { type: "string", example: "System Administrator" },
      golongan: { type: "string", example: "IV/E" },
      unitKerjaKode: { type: "string", example: "KP-TI" },
      unitKerjaNama: {
        type: "string",
        example: "Kantor Pusat - TI & Transformasi Digital",
      },
      role: {
        type: "string",
        enum: [
          "OFFICIAL_BOOKER",
          "APPROVER_KAKANWIL",
          "ADMIN_TRAVEL_KP",
          "ASDEP_KEUANGAN",
          "SUPER_ADMIN",
        ],
        example: "SUPER_ADMIN",
      },
    },
  },
  UserManagementItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "b219e120-192a-4311-b01f-019234102941",
      },
      npk: { type: "string", example: "10000001" },
      namaLengkap: { type: "string", example: "Super Admin E-TO" },
      email: {
        type: "string",
        example: "super.admin@bpjsketenagakerjaan.go.id",
      },
      jabatan: { type: "string", example: "System Administrator" },
      golongan: { type: "string", example: "IV/E" },
      unitKerjaKode: { type: "string", example: "KP-TI" },
      unitKerjaNama: {
        type: "string",
        example: "Kantor Pusat - TI & Transformasi Digital",
      },
      avatarInitials: { type: "string", example: "SA" },
      role: { type: "string", example: "SUPER_ADMIN" },
      status: {
        type: "string",
        enum: ["active", "inactive"],
        example: "active",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-09-17T08:00:00Z",
      },
    },
  },
  UpdateUserRequest: {
    type: "object",
    properties: {
      namaLengkap: { type: "string", example: "Budi Santoso, S.E." },
      email: {
        type: "string",
        example: "approver.kakanwil@bpjsketenagakerjaan.go.id",
      },
      password: { type: "string", example: "PasswordBaru123!" },
      jabatan: { type: "string", example: "Kepala Kantor Wilayah DKI Jakarta" },
      golongan: { type: "string", example: "IV/C" },
      unitKerjaKode: { type: "string", example: "KW-DKI" },
      unitKerjaNama: { type: "string", example: "Kantor Wilayah DKI Jakarta" },
      role: {
        type: "string",
        enum: [
          "SUPER_ADMIN",
          "OFFICIAL_BOOKER",
          "APPROVER_KAKANWIL",
          "ADMIN_TRAVEL_KP",
          "ASDEP_KEUANGAN",
        ],
        example: "APPROVER_KAKANWIL",
      },
    },
  },
  ToggleStatusRequest: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["active", "inactive"],
        example: "inactive",
      },
    },
  },
};
