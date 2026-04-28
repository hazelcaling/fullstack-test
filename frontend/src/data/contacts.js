const hte_contacts = [
    {
        name: "Phil Haas",
        role: "Outside Sales",
        company: "HTE",
        email: "phil@htecompany.com",
        mobile: 7075488790 
    },
    {
        name: "Michael Llorence",
        role: "Outside Sales",
        company: "HTE",
        email: "michael@htecompany.com",
        mobile: 7074792752
    },
    {
        name: "Luke Hanzlik",
        role: "Outside Sales",
        company: "HTE",
        email: "luke@htecompany.com",
        mobile: 6505019569
    },
    {
        name: "Mark Labitad",
        role: "Outside Sales",
        company: "HTE",
        email: "mark@htecompany.com",
        mobile: 6504369275
    },
    {
        name: "Alex White",
        role: "Outside Sales",
        company: "HTE",
        email: "alex@htecompany.com",
        mobile: 65066399384
    },
    {
        name: "Hazel Caling",
        role: "Inside Sales",
        company: "HTE",
        email: "hazel@htecompany.com",
        mobile: 4152255241
    },
    {
        name: "Rhi Cannon",
        role: "Inside Sales",
        company: "HTE",
        email: "rhiannon@htecompany.com",
        mobile: 6504900744
    }
]


const outsideSalesNames = hte_contacts
  .filter(c => c.role === "Outside Sales")
  .map(c => c.name);

export default outsideSalesNames;