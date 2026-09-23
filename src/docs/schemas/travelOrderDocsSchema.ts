export const travelOrderDocsSchema = {
  CreateTravelOrderRequest: {
    type: 'object',
    required: ['activityName', 'unitKerjaNama', 'sprinNumber', 'sprinDetail', 'travellers'],
    properties: {
      existingToOption: {
        type: 'string',
        nullable: true,
        example: 'TO/2026/05/00100',
        description: 'Kode TO Existing jika gabungan order',
      },
      toCode: {
        type: 'string',
        example: 'TO/2026/05/00214',
      },
      orderDate: {
        type: 'string',
        format: 'date',
        example: '2026-05-14',
      },
      activityName: {
        type: 'string',
        example: 'Sosialisasi Program Jaminan Kehilangan Pekerjaan (JKP) Wilayah Jawa Timur',
      },
      unitKerjaKode: {
        type: 'string',
        example: 'KANWIL-JATIM',
      },
      unitKerjaNama: {
        type: 'string',
        example: 'Kantor Wilayah Jawa Timur',
      },
      programKerja: {
        type: 'string',
        example: 'Peningkatan Kepesertaan Aktif Sektor Formal 2026',
      },
      approverNama: {
        type: 'string',
        example: 'Pejabat Penyetuju Test',
      },
      approverId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '1db92cc3-4b16-4e39-87e2-43663cf100fd',
        description: 'UUID Pejabat Penyetuju (Kakanwil Jatim). Jika kosong/null, backend otomatis mencarinya dari DB.',
      },
      budgetAccount: {
        type: 'string',
        example: '521211 - Belanja Perjalanan Dinas Biasa',
      },
      budgetId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      },
      sprinNumber: {
        type: 'string',
        example: 'SPRIN/442/DIR-OPS/V/2026',
      },
      sprinDetail: {
        type: 'string',
        example: 'Koordinasi teknis penanganan klaim JKP dan verifikasi data peserta bersama dinas tenaga kerja setempat.',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'Preferensi penjemputan bandara bila diperlukan',
      },
      remainingBudget: {
        type: 'number',
        example: 145750000,
      },
      travellers: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/TravellerItemSchema',
        },
      },
    },
  },

  TravellerItemSchema: {
    type: 'object',
    required: ['name', 'phone', 'maskapai', 'departureDate'],
    properties: {
      category: {
        type: 'string',
        enum: ['INTERNAL', 'EKSTERNAL'],
        example: 'INTERNAL',
      },
      name: {
        type: 'string',
        example: 'Rian Hidayat',
      },
      npkOrKtp: {
        type: 'string',
        example: '198804122011',
      },
      jabatanOrInstansi: {
        type: 'string',
        example: 'Penata Madya Pengendalian Mutu',
      },
      phone: {
        type: 'string',
        example: '081234567890',
      },
      route: {
        type: 'string',
        example: 'JKT ⇄ SUB',
      },
      originCity: {
        type: 'string',
        example: 'Jakarta (CGK / HLP)',
      },
      destCity: {
        type: 'string',
        example: 'Surabaya (SUB)',
      },
      departureDate: {
        type: 'string',
        format: 'date',
        example: '2026-05-20',
      },
      departureTime: {
        type: 'string',
        example: '08:30 WIB',
      },
      departureInfo: {
        type: 'string',
        example: '2026-05-20 · 08:30 WIB (Pergi)',
      },
      maskapai: {
        type: 'string',
        example: 'Garuda Indonesia',
      },
      kelas: {
        type: 'string',
        example: 'Ekonomi (Kelas Y)',
      },
      isRoundTrip: {
        type: 'boolean',
        example: true,
      },
      returnDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2026-05-22',
      },
      returnTime: {
        type: 'string',
        nullable: true,
        example: '17:45 WIB',
      },
      returnInfo: {
        type: 'string',
        nullable: true,
        example: '2026-05-22 · 17:45 WIB (Pulang)',
      },
      price: {
        type: 'number',
        example: 2816666,
      },
    },
  },
}